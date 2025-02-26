const router = require('express').Router();
const SearchHistory = require('../Models/SearchHistory');
const ensureAuthenticated = require('../Middlewares/Auth');

// Get user's search history
router.get('/history', ensureAuthenticated, async (req, res) => {
    try {
        const history = await SearchHistory.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10);
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching search history' });
    }
});

// Get personalized recommendations based on user's history
router.get('/recommendations', ensureAuthenticated, async (req, res) => {
    try {
        const history = await SearchHistory.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(5);

        // Collect unique images from recent searches
        const recommendedImages = new Set();
        history.forEach(search => {
            search.similarImages.forEach(img => recommendedImages.add(img));
        });

        res.json({
            success: true,
            recommendations: Array.from(recommendedImages).slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching recommendations' });
    }
});

// Save search history
router.post('/save', ensureAuthenticated, async (req, res) => {
    try {
        const { originalImage, similarImages } = req.body;
        const searchHistory = new SearchHistory({
            userId: req.user.id,
            originalImage,
            similarImages
        });
        await searchHistory.save();
        res.json({ success: true, message: 'Search history saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving search history' });
    }
});

module.exports = router; 