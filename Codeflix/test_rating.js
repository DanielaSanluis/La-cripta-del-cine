import http from 'http';

/**
 * test_rating.js
 * Script de prueba rápida para validar el endpoint /api/movies/:id/rate
 * Uso: node test_rating.js  (asegúrate de que el servidor esté corriendo)
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MOVIE_ID = Number(process.env.MOVIE_ID || process.argv[2] || 1);

/**
 * request
 * Realiza una petición HTTP simple y devuelve un objeto con helpers.
 * @param {string} url
 * @param {object} [options]
 * @param {string|null} [body]
 * @returns {Promise<{ok:boolean,statusText:string,json:function}>}
 */
function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 80,
            path: parsedUrl.pathname + (parsedUrl.search || ''),
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        statusText: res.statusMessage,
                        json: () => JSON.parse(data)
                    });
                } catch (e) {
                    // En caso de que la respuesta no sea JSON
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusText: res.statusMessage, json: async () => { throw e; } });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

async function testRating() {
    try {
        // 1. Get current movie data
        console.log('Fetching current movie data...', BASE_URL, 'movie id', MOVIE_ID);
        const initialRes = await request(`${BASE_URL}/api/movies/${MOVIE_ID}`);
        if (!initialRes.ok) throw new Error(`Failed to fetch movie: ${initialRes.statusText}`);
        const initialMovie = await initialRes.json();

        console.log('Initial State:', {
            gore: initialMovie.gore,
            gore_count: initialMovie.gore_count,
            scares: initialMovie.scares,
            scares_count: initialMovie.scares_count
        });

        // 2. Calculate expected values
        const goreCount = Number.isFinite(initialMovie.gore_count) ? initialMovie.gore_count : (typeof initialMovie.gore === 'number' ? 1 : 0);
        const scaresCount = Number.isFinite(initialMovie.scares_count) ? initialMovie.scares_count : (typeof initialMovie.scares === 'number' ? 1 : 0);

        const newVote = 5;

        const expectedGore = parseFloat((((initialMovie.gore * goreCount) + newVote) / (goreCount + 1)).toFixed(1));
        const expectedScares = parseFloat((((initialMovie.scares * scaresCount) + newVote) / (scaresCount + 1)).toFixed(1));

        console.log(`Sending 5-star rating... Expected Gore: ${expectedGore}, Expected Scares: ${expectedScares}`);

        // 3. Send rating
        const rateRes = await request(`${BASE_URL}/api/movies/${MOVIE_ID}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            gore: newVote,
            scares: newVote,
            jumpscares: newVote,
            suspense: newVote
        }));

        if (!rateRes.ok) throw new Error(`Failed to rate movie: ${rateRes.statusText}`);
        const rateData = await rateRes.json();
        const updatedMovie = rateData.movie;

        console.log('Updated State:', {
            gore: updatedMovie.gore,
            gore_count: updatedMovie.gore_count,
            scares: updatedMovie.scares,
            scares_count: updatedMovie.scares_count
        });

        // 4. Verify
        let passed = true;
        if (updatedMovie.gore !== expectedGore) {
            console.error(`❌ Gore mismatch! Expected ${expectedGore}, got ${updatedMovie.gore}`);
            passed = false;
        }
        if (updatedMovie.scares !== expectedScares) {
            console.error(`❌ Scares mismatch! Expected ${expectedScares}, got ${updatedMovie.scares}`);
            passed = false;
        }
        if (updatedMovie.gore_count !== goreCount + 1) {
            console.error(`❌ Gore count mismatch! Expected ${goreCount + 1}, got ${updatedMovie.gore_count}`);
            passed = false;
        }

        if (passed) {
            console.log('✅ Test Passed!');
        } else {
            console.error('❌ Test Failed');
            process.exit(1);
        }

    } catch (error) {
        console.error('Test Error:', error);
        process.exit(1);
    }
}

testRating();
