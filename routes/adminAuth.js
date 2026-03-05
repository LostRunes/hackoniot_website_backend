export const adminAuth = (req, res, next) => {
    // Ultra-simple basic auth
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // Hardcoded per requirements
    if (login && password && login === 'bunty' && password === 'buntybhaiya') {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
};
