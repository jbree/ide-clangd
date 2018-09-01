const htmlparser = require('htmlparser2');
const semver = require('semver')
const fetch = require('node-fetch');
const Request = fetch.Request;

function regexForPlatform(platform)
{
    if (!platform) {
        platform = process.platform;
    }

    return new Promise((resolve, reject) => {
        switch (platform) {
            case 'darwin':
                return resolve(/x86_64-apple-darwin/);

            default:
                return reject(`Unsupported platform: ${platform}`);
        }
    })

}

function scrape(platform) {
    const url = 'http://releases.llvm.org/download.html';
    const request = new Request(url);
    const tarballRegex = /(?:^(\d+\.\d+\.?\d*)\/clang\+llvm.*\.tar.\wz$)/;

    return new Promise((resolve, reject) => {
        let platformRegex;
        let bestVersion = '0.0.1';
        let bestUrl = '';

        regexForPlatform(platform)
            .then(regex => {
                platformRegex = regex;
            })
            .then(() => fetch(request))
            .then(res => res.text())
            .then(body => {
                let parser = new htmlparser.Parser({
                    onopentag: function(name, attribs) {

                        const link = attribs.href;

                        if (name !== 'a' || !link) {
                            return;
                        }

                        // filter downloads for this platform
                        let platformMatch = link.match(platformRegex);
                        if (!platformMatch) {
                            return;
                        }

                        // only looking for clang+llvm tarballs
                        let tarballMatch = link.match(tarballRegex);
                        if (!tarballMatch) {
                            return;
                        }

                        // find the best version
                        let coerced = semver.coerce(tarballMatch[1])

                        if (semver.gt(coerced, bestVersion)) {
                            bestVersion = coerced;
                            bestUrl = tarballMatch.input;
                        }
                    }
                });

                parser.write(body);
                parser.end();

                if (!bestUrl) {
                    return reject("No matching downloads found");
                }

                return resolve({
                    version: bestVersion.raw,
                    url: bestUrl
                });
            })
            .catch(err => {
                return reject(err)
            });
    });
}

module.exports = scrape;

scrape(url)
    .then(scraped => {
        console.log(scraped);
    })
    .catch(err => {
        console.error(err);
    })
