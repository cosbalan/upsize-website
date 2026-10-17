// After each successful PRODUCTION deploy, tell Bing/Yandex/Seznam (IndexNow) about every URL in the sitemap.
const fs = require('fs');
const path = require('path');
const KEY = 'e40efc3e56ff44097b926dab874c83ab';
const HOST = 'www.upsizeproperty.com';
module.exports = {
  async onSuccess({ constants, utils }) {
    if (process.env.CONTEXT !== 'production') return console.log('IndexNow: skipped (not production)');
    try {
      const xml = fs.readFileSync(path.join(constants.PUBLISH_DIR, 'sitemap.xml'), 'utf8');
      const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !/\.(jpe?g|png|webp)$/i.test(u));
      const r = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
      });
      console.log(`IndexNow: submitted ${urlList.length} URLs -> HTTP ${r.status}`);
    } catch (e) {
      console.log('IndexNow: failed (deploy unaffected) ' + e.message);
    }
  },
};
