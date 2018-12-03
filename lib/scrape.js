const htmlparser = require('htmlparser2');
const semver = require('semver');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');

const { Request } = fetch;

const downloadPlatform = {
  darwin: 'x86_64-apple-darwin',
  linux: 'x86_64-linux-gnu-ubuntu',
  win32: os.arch() === 'x64' ? 'win64' : 'win32',
};

const downloadName = {
  darwin: 'clang\\+llvm',
  linux: 'clang\\+llvm',
  win32: 'LLVM',
};

const downloadSuffix = {
  darwin: 'tar\\.\\wz',
  linux: 'tar\\.\\wz',
  win32: 'exe',
};


function regexForPlatform (platform) {
  const p = platform || os.platform();
  const clangVersion = '(?:^(\\d+\\.\\d+\\.?\\d*))';
  let osVersion = '';

  if (platform === 'linux') {
    osVersion = '-\\d+\\.\\d+';
  }

  const regex = new RegExp(
    `${clangVersion}/${downloadName[p]}-.*-${downloadPlatform[p]}\\${osVersion}.${downloadSuffix[p]}`,
  );

  return regex;
}


function scrapeDownloadInfo (platform) {
  const prefix = 'http://releases.llvm.org/';
  const resource = 'download.html';
  const request = new Request(prefix + resource);

  const downloadRegex = regexForPlatform(platform);

  return new Promise((resolve, reject) => {
    let bestVersion = '0.0.1';
    let bestUrl = '';

    fetch(request)
      .then(res => res.text())
      .then((body) => {
        const parser = new htmlparser.Parser({
          onopentag (name, attribs) {
            const link = attribs.href;

            if (name !== 'a' || !link) {
              return;
            }

            // filter downloads for this platform
            const match = link.match(downloadRegex);
            if (!match) {
              return;
            }

            // find the best version
            const coerced = semver.coerce(match[1]);

            if (semver.gt(coerced, bestVersion)) {
              bestVersion = coerced;
              bestUrl = match.input;
            }
          },
        });

        parser.write(body);
        parser.end();

        if (!bestUrl) {
          return reject(Error('No matching downloads found'));
        }

        return resolve({
          version: bestVersion.raw,
          url: prefix + bestUrl,
          file: path.basename(bestUrl),
        });
      })
      .catch(err => reject(err));
  });
}

module.exports = scrapeDownloadInfo;
