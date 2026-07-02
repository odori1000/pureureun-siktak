export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-password'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const requestPassword = req.headers['x-admin-password'] || req.body?.adminPassword;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Server configuration error: ADMIN_PASSWORD is not set.' });
  }

  if (requestPassword === adminPassword) {
    return res.status(200).json({ success: true, message: '인증에 성공했습니다.' });
  } else {
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }
}
