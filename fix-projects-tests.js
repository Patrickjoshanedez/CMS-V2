const fs = require('fs');
const path = require('path');

const fixFile = (relPath) => {
  const file = path.join('c:/Users/patri/OneDrive/Desktop/Holy folder/CMS-V2/server/tests/integration', relPath);
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('createCourseAndSection')) {
    content = content.replace(/import \{([^}]+)\} from '\.\.\/helpers\.js';/, (match, p1) => {
      return \import {\, createCourseAndSection, createValidProjectPayload} from '../helpers.js';\;
    });
  }

  // Very simple replacements for specific missing parts in loops
  fs.writeFileSync(file, content);
};

// We will do more robust fix with Python script
