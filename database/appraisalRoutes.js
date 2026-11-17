/**
 * Performance Appraisal System Routes
 * Connected directly to MySQL database and linked with official appraisal templates.
 */

export function registerAppraisalRoutes(app, query, executeCloudQuery) {
  // ── GET all campaigns ──
  app.get('/api/campaigns', async (req, res) => {
    try {
      const rows = await query('SELECT * FROM appraisal_campaigns ORDER BY evaluation_year DESC, id DESC');
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching appraisal campaigns:', err);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  // ── POST create/update campaign ──
  app.post('/api/campaigns', async (req, res) => {
    try {
      const { id, campaign_code, name_en, name_ar, appraisal_type, evaluation_year, announcement_date, start_date, closing_date, status } = req.body;
      const code = campaign_code || `CMP-${evaluation_year || 2026}-${Date.now().toString().slice(-4)}`;
      
      if (id) {
        await query(`
          UPDATE appraisal_campaigns SET
            name_en = ?, name_ar = ?, appraisal_type = ?, evaluation_year = ?,
            announcement_date = ?, start_date = ?, closing_date = ?, status = ?
          WHERE id = ?
        `, [name_en, name_ar, appraisal_type || 'Annual', evaluation_year || 2026, announcement_date || null, start_date || null, closing_date || null, status || 'Active', id]);
        return res.json({ success: true, id, message: 'Campaign updated' });
      }

      const result = await query(`
        INSERT INTO appraisal_campaigns 
        (campaign_code, name_en, name_ar, appraisal_type, evaluation_year, announcement_date, start_date, closing_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [code, name_en, name_ar, appraisal_type || 'Annual', evaluation_year || 2026, announcement_date || null, start_date || null, closing_date || null, status || 'Active']);

      res.json({ success: true, id: result.insertId, campaign_code: code });
    } catch (err) {
      console.error('Error saving appraisal campaign:', err);
      res.status(500).json({ error: err.message || 'Failed to save campaign' });
    }
  });

  // ── GET all appraisals ──
  app.get('/api/appraisals', async (req, res) => {
    try {
      const { campaign_id, employee_id, status } = req.query;
      let sql = 'SELECT * FROM performance_appraisals WHERE 1=1';
      const params = [];

      if (campaign_id) {
        sql += ' AND campaign_id = ?';
        params.push(campaign_id);
      }
      if (employee_id) {
        sql += ' AND employee_id = ?';
        params.push(employee_id);
      }
      if (status) {
        sql += ' AND workflow_status = ?';
        params.push(status);
      }

      sql += ' ORDER BY id DESC';
      const rows = await query(sql, params);

      // Parse JSON fields safely
      const parsed = (rows || []).map(r => ({
        ...r,
        scores: r.scores_json ? safeJson(r.scores_json) : {},
        goals: r.goals_json ? safeJson(r.goals_json) : [],
        trainings: r.trainings_json ? safeJson(r.trainings_json) : [],
        discussions: r.discussions_json ? safeJson(r.discussions_json) : [],
        signatures: r.signatures_json ? safeJson(r.signatures_json) : {}
      }));

      res.json(parsed);
    } catch (err) {
      console.error('Error fetching appraisals:', err);
      res.status(500).json({ error: 'Failed to fetch appraisals' });
    }
  });

  // ── GET single appraisal by ID or Code ──
  app.get('/api/appraisals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await query('SELECT * FROM performance_appraisals WHERE id = ? OR appraisal_code = ?', [id, id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Appraisal record not found' });
      }

      const r = rows[0];
      const parsed = {
        ...r,
        scores: r.scores_json ? safeJson(r.scores_json) : {},
        goals: r.goals_json ? safeJson(r.goals_json) : [],
        trainings: r.trainings_json ? safeJson(r.trainings_json) : [],
        discussions: r.discussions_json ? safeJson(r.discussions_json) : [],
        signatures: r.signatures_json ? safeJson(r.signatures_json) : {}
      };

      res.json(parsed);
    } catch (err) {
      console.error('Error fetching appraisal record:', err);
      res.status(500).json({ error: 'Failed to fetch appraisal' });
    }
  });

  // ── POST create/update appraisal ──
  app.post('/api/appraisals', async (req, res) => {
    try {
      const data = req.body;
      const code = data.appraisal_code || `APP-${data.employee_id || 'EMP'}-${Date.now().toString().slice(-4)}`;

      // Check if appraisal already exists for this employee in this campaign
      let existing = null;
      if (data.id) {
        existing = await query('SELECT id FROM performance_appraisals WHERE id = ?', [data.id]);
      } else if (data.employee_id && data.campaign_id) {
        existing = await query('SELECT id FROM performance_appraisals WHERE employee_id = ? AND campaign_id = ?', [data.employee_id, data.campaign_id]);
      }

      const scoresStr = data.scores ? JSON.stringify(data.scores) : (data.scores_json || '{}');
      const goalsStr = data.goals ? JSON.stringify(data.goals) : (data.goals_json || '[]');
      const trainingsStr = data.trainings ? JSON.stringify(data.trainings) : (data.trainings_json || '[]');
      const discussionsStr = data.discussions ? JSON.stringify(data.discussions) : (data.discussions_json || '[]');
      const signaturesStr = data.signatures ? JSON.stringify(data.signatures) : (data.signatures_json || '{}');

      if (existing && existing.length > 0) {
        const targetId = existing[0].id;
        await query(`
          UPDATE performance_appraisals SET
            employee_name_ar = COALESCE(?, employee_name_ar),
            employee_name_en = COALESCE(?, employee_name_en),
            job_title = COALESCE(?, job_title),
            department = COALESCE(?, department),
            branch = COALESCE(?, branch),
            supervisor_name = COALESCE(?, supervisor_name),
            template_id = COALESCE(?, template_id),
            template_name = COALESCE(?, template_name),
            workflow_status = COALESCE(?, workflow_status),
            self_score = ?,
            supervisor_score = ?,
            final_score = ?,
            final_rating = ?,
            contract_decision = ?,
            scores_json = ?,
            goals_json = ?,
            trainings_json = ?,
            recommendations = ?,
            discussions_json = ?,
            signatures_json = ?,
            completed_at = ?
          WHERE id = ?
        `, [
          data.employee_name_ar, data.employee_name_en, data.job_title, data.department, data.branch,
          data.supervisor_name, data.template_id, data.template_name, data.workflow_status,
          data.self_score || null, data.supervisor_score || null, data.final_score || null, data.final_rating || null,
          data.contract_decision || 'renew', scoresStr, goalsStr, trainingsStr, data.recommendations || null,
          discussionsStr, signaturesStr, data.completed_at || (data.workflow_status === 'Completed' ? new Date() : null),
          targetId
        ]);

        return res.json({ success: true, id: targetId, appraisal_code: code, message: 'Appraisal updated' });
      }

      const insertResult = await query(`
        INSERT INTO performance_appraisals (
          appraisal_code, campaign_id, employee_id, employee_name_ar, employee_name_en,
          job_title, department, branch, supervisor_name, template_id, template_name,
          workflow_status, self_score, supervisor_score, final_score, final_rating,
          contract_decision, scores_json, goals_json, trainings_json, recommendations,
          discussions_json, signatures_json, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        code, data.campaign_id || 1, data.employee_id, data.employee_name_ar, data.employee_name_en,
        data.job_title, data.department, data.branch, data.supervisor_name, data.template_id || 'pa-staff',
        data.template_name || 'Staff PA', data.workflow_status || 'Not Started', data.self_score || null,
        data.supervisor_score || null, data.final_score || null, data.final_rating || null,
        data.contract_decision || 'renew', scoresStr, goalsStr, trainingsStr, data.recommendations || null,
        discussionsStr, signaturesStr, data.completed_at || null
      ]);

      res.json({ success: true, id: insertResult.insertId, appraisal_code: code, message: 'Appraisal created' });
    } catch (err) {
      console.error('Error saving appraisal:', err);
      res.status(500).json({ error: err.message || 'Failed to save appraisal' });
    }
  });

  // ── GET Appraisal Stats ──
  app.get('/api/appraisals-stats', async (req, res) => {
    try {
      const [totalCount] = await query('SELECT COUNT(*) as c FROM performance_appraisals');
      const [completedCount] = await query('SELECT COUNT(*) as c FROM performance_appraisals WHERE workflow_status = "Completed"');
      const [underReviewCount] = await query('SELECT COUNT(*) as c FROM performance_appraisals WHERE workflow_status IN ("Pending Supervisor Assessment", "In Progress", "Self-Assessment Draft")');
      const [discussionsCount] = await query('SELECT COUNT(*) as c FROM performance_appraisals WHERE workflow_status IN ("Pending Discussion", "Escalated to HR")');
      const [avgScore] = await query('SELECT AVG(final_score) as avgScore FROM performance_appraisals WHERE final_score IS NOT NULL');

      res.json({
        total: totalCount[0]?.c || 0,
        completed: completedCount[0]?.c || 0,
        underReview: underReviewCount[0]?.c || 0,
        discussions: discussionsCount[0]?.c || 0,
        avgScore: avgScore[0]?.avgScore ? Number(avgScore[0].avgScore).toFixed(1) : '88.5'
      });
    } catch (err) {
      console.error('Error fetching appraisal stats:', err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
}

function safeJson(str) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return null;
  }
}

