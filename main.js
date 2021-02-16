let fetch = await require("node-fetch");
let jsdom = await require("jsdom");
const JSDOM = jsdom.JSDOM;
let radar = await require("svg-radar-chart");
const vds = await require("virtual-dom-stringify");
let sharp = await require("sharp");

async function cmdHandler(m) {
    /** @type {string} */
    let username = m.args.slice(1).join(" ");

    if (!username || !username.trim().length) {
        return {
            formatter: "default",
            data: {
                content: "You must call this command with registered osu! username."
            }
        }
    }

    let fURL = `http://osuskills.com/user/${encodeURIComponent(username)}`;

    let hRequest = await fetch(fURL);
    /** @type {string} */
    let hData = await hRequest.text();

    let dom = new JSDOM(hData, {
        url: fURL,
        contentType: "text/html"
    });
    if (dom.window.document.querySelector("#playerContent")) {
        // Check if osuSkills are updating data.
        let isUpdating = !!dom.window.document.querySelector(".fa-spinner");
        let lastChecked = dom.window.document.querySelector(".timeago")?.title;

        /** @type {[string, number][]} */
        let skills = [...dom.window.document.querySelectorAll(".skillsList li")].map(
            e => [
                (e.querySelector(".skillLabel a") ?? e.querySelector(".skillLabel")).innerHTML, 
                +e.querySelector(".skillValue").innerHTML
            ]
        );

        let maxPoint = Math.max(1000, Math.max(skills.map(x => x[1])));

        /** @type {{ [x: string]: number }} */
        let so = Object.fromEntries(skills.map(x => [x[0], x[1] / maxPoint]));

        let chart = radar(
            Object.fromEntries(skills.map(x => [x[0], x[0] + ": " + x[1]])),
            [{
                color: '#edc951',
                ...so
            }],
            {
                size: 1000
            }
        );

        let svg = `
<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <style>
        .axis {
            stroke-width: .2;
        }
        .scale {
            stroke-width: .2;
        }
        .shape {
            fill-opacity: .7;
        }
    </style>
    ${vds(chart)}
</svg>
`;

        let png = await sharp(Buffer.from(svg, "utf8")).resize(1000, 1000).toBuffer();

        let lcString = "";
        if (lastChecked) {
            let lcDate = new Date(lastChecked);
            if (Date.now() - lcDate.getTime() <= 5000) {
                lcString = "now";
            } else if (Date.now() - lcDate.getTime() <= 90000) {
                lcString = "about a minute ago";
            } else if (Date.now() - lcDate.getTime() <= 3600000) {
                lcString = `${Math.round((Date.now() - lcDate.getTime()) / 60000)} minutes ago`;
            } else if (Date.now() - lcDate.getTime() <= 86400000) {
                lcString = `${Math.round((Date.now() - lcDate.getTime()) / 3600000)} hours ago`;
            } else {
                lcString = `${lcDate.getUTCDate()}/${lcDate.getUTCMonth() + 1}/${lcDate.getUTCFullYear()} ${lcDate.getUTCHours()}:${lcDate.getUTCMinutes()}:${lcDate.getUTCSeconds} UTC`
            }
        } else {
            lcString = "never";
        }

        return {
            formatter: "default",
            data: {
                content: `${username}\nLast checked: ${lcString}${isUpdating ? " (Updating)" : ""}`,
                attachments: [png]
            }
        }
    } else {
        return {
            formatter: "default",
            data: {
                content: "You must call this command with registered osu! username."
            }
        }
    }
}

return {
    cmdHandler
}