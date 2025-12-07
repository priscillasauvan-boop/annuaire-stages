import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_CODE = '123efface';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const result = await client.query(
        'SELECT * FROM lieux_stage WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lieu non trouvé' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { ville, nom_lieu, informations } = req.body;

      if (!ville || !nom_lieu) {
        return res.status(400).json({ error: 'Ville et nom du lieu requis' });
      }

      const result = await client.query(
        `UPDATE lieux_stage 
         SET ville = $1, nom_lieu = $2, informations = $3
         WHERE id = $4
         RETURNING *`,
        [ville, nom_lieu, informations || '', id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lieu non trouvé' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const adminCode = req.query.admin;

      if (adminCode !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Code admin incorrect' });
      }

      const result = await client.query(
        'DELETE FROM lieux_stage WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lieu non trouvé' });
      }

      return res.status(200).json({ success: true, deleted: result.rows[0] });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Erreur API lieu:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
}
