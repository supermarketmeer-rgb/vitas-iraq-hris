const http = require('http');

function request(url, cookie = '') {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { headers: { Cookie: cookie } }, res => {
            let data = '';
            const setCookie = res.headers['set-cookie'];
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data, setCookie }));
        });
        req.on('error', reject);
    });
}

async function run() {
    console.log('Testing SSO login with embedded=1...');
    const ssoRes = await request('http://localhost:5000/hr_drivers/trips.php?embedded=1');
    console.log('SSO response status:', ssoRes.statusCode);
    const cookie = ssoRes.setCookie ? ssoRes.setCookie.map(c => c.split(';')[0]).join('; ') : '';
    console.log('Cookie received:', cookie ? 'Yes' : 'No');

    for (const page of ['trips.php', 'trip_add.php', 'trip_approval.php', 'offices.php', 'reports.php']) {
        const res = await request(`http://localhost:5000/hr_drivers/${page}`, cookie);
        console.log(`Page ${page} -> Status: ${res.statusCode}, Location: ${res.headers['location']}, Body length: ${res.data.length} bytes`);
        if (res.statusCode !== 200) {
            console.error(`Error on ${page}:`, res.data.substring(0, 300));
        }
    }
}

run().catch(console.error);
