const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchHistorySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    originalImage: {
        type: String,
        required: true
    },
    similarImages: [{
        type: String,
        required: true
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SearchHistoryModel = mongoose.model('search_history', SearchHistorySchema);
module.exports = SearchHistoryModel; 