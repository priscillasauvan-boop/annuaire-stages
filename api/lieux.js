import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_CODE = process.env.ADMIN_CODE || '123efface';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS lieux_stage (
        id SERIAL PRIMARY KEY,
        ville VARCHAR(255) NOT NULL,
        nom_lieu VARCHAR(255) NOT NULL,
        informations TEXT,
        added_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (req.method === 'GET') {
      const adminCode = req.query.admin;
      
      if (adminCode) {
        const isAdmin = adminCode === ADMIN_CODE;
        return res.status(200).json({ isAdmin });
      }
      
      const result = await client.query(
        'SELECT * FROM lieux_stage ORDER BY ville, nom_lieu'
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { ville, nom_lieu, informations } = req.body;

      if (!ville || !nom_lieu) {
        return res.status(400).json({ error: 'Ville et nom du lieu requis' });
      }

      const result = await client.query(
        `INSERT INTO lieux_stage (ville, nom_lieu, informations, added_by)
         VALUES ($1, $2, $3, 'web')
         RETURNING *`,
        [ville, nom_lieu, informations || '']
      );

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Erreur API lieux:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
}
