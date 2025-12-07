import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_CODE = process.env.ADMIN_CODE || '123efface';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS demandes_suppression (
        id SERIAL PRIMARY KEY,
        lieu_signale VARCHAR(255) NOT NULL,
        raison TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        traitee BOOLEAN DEFAULT FALSE
      )
    `);

    if (req.method === 'GET') {
      const adminCode = req.query.admin;
      
      if (adminCode !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
      
      const result = await client.query(
        'SELECT * FROM demandes_suppression ORDER BY created_at DESC'
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { lieu_signale, raison } = req.body;

      if (!lieu_signale || !raison) {
        return res.status(400).json({ error: 'Lieu et raison requis' });
      }

      const result = await client.query(
        `INSERT INTO demandes_suppression (lieu_signale, raison)
         VALUES ($1, $2)
         RETURNING *`,
        [lieu_signale, raison]
      );

      return res.status(201).json({ success: true, demande: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      const adminCode = req.query.admin;
      const { id } = req.query;

      if (adminCode !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Code admin incorrect' });
      }

      await client.query(
        'DELETE FROM demandes_suppression WHERE id = $1',
        [id]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Erreur API demandes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
}
