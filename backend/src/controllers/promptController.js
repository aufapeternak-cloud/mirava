export const promptController = {
  parseManualPrompts(req, res) {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid prompt text' });
      }

      const prompts = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      res.json({
        prompts,
        count: prompts.length
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  parseFilePrompts(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const content = req.file.buffer.toString('utf-8');
      const lines = content.split('\n');

      const maxLines = parseInt(process.env.MAX_PROMPT_LINES) || 1000;
      if (lines.length > maxLines) {
        return res.status(400).json({
          error: `File exceeds maximum line limit of ${maxLines}`
        });
      }

      const prompts = lines
        .map(line => line.trim())
        .filter(line => line.length > 0);

      res.json({
        prompts,
        count: prompts.length,
        filename: req.file.originalname
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
