const fs = require('fs');
const path = require('path');

// 1. Mod submission.model.js
let subModel = fs.readFileSync('modules/submissions/submission.model.js', 'utf8');
if (!subModel.includes('prototypeLink:')) {
    subModel = subModel.replace(/status:\s*\{\s*type:\s*String,([\s\S]*?)\},/, "status": { type: String,  },\n    prototypeLink: {\n      type: String,\n      trim: true,\n      default: null\n    },);
    subModel = subModel.replace(/status:\s*\{\s*type:\s*String,([\s\S]*?)\},/, status: { type: String,  },\n    grade: {\n      type: Number,\n      min: 0,\n      max: 100\n    },\n    rating: {\n      type: String,\n      enum: ['Pass', 'Fail']\n    },);
    fs.writeFileSync('modules/submissions/submission.model.js', subModel);
}
