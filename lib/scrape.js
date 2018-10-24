const htmlparser = require('htmlparser2');
const semver = require('semver');
const fetch = require('node-fetch');

const { Request } = fetch;

function regexForPlatform (platform)
{
  const p = !platform ? process.platform : platform;

  return new Promise((resolve, reject) => {
    switch (p) {
    case 'darwin':
      return resolve(/x86_64-apple-darwin/);

    default:
      return reject(Error(`Unsupported platform: ${platform}`));
    }
  });
}

function scrapeDownloadInfo (platform) {
  const prefix = 'http://releases.llvm.org/';
  const resource = 'download.html';
  const request = new Request(prefix + resource);
  const tarballRegex = /(?:^(\d+\.\d+\.?\d*)\/clang\+llvm.*\.tar.\wz$)/;

  return new Promise((resolve, reject) => {
    let platformRegex;
    let bestVersion = '0.0.1';
    let bestUrl = '';

    regexForPlatform(platform)
      .then((regex) => {
        platformRegex = regex;
      })
      .then(() => fetch(request))
      .then(res => res.text())
      .then((body) => {
        const parser = new htmlparser.Parser({
          onopentag (name, attribs) {
            const link = attribs.href;

            if (name !== 'a' || !link) {
              return;
            }

            // filter downloads for this platform
            const platformMatch = link.match(platformRegex);
            if (!platformMatch) {
              return;
            }

            // only looking for clang+llvm tarballs
            const tarballMatch = link.match(tarballRegex);
            if (!tarballMatch) {
              return;
            }

            // find the best version
            const coerced = semver.coerce(tarballMatch[1]);

            if (semver.gt(coerced, bestVersion)) {
              bestVersion = coerced;
              bestUrl = tarballMatch.input;
            }
          },
        });

        parser.write(body);
        parser.end();

        if (!bestUrl) {
          return reject(Error('No matching downloads found'));
        }

        const fileRegex = /(clang\+llvm.*\.tar\.\wz)$/;
        const file = bestUrl.match(fileRegex)[1];

        return resolve({
          version: bestVersion.raw,
          url: prefix + bestUrl,
          file,
        });
      })
      .catch(err => reject(err));
  });
}

module.exports = scrapeDownloadInfo;
