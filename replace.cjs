const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            content = content.replace(/schedule\.studentIds\?\.length \? schedule\.studentIds : \(schedule\.studentId \? \[schedule\.studentId\] : \[\]\)/g, 'getScheduleStudentIds(schedule)');
            content = content.replace(/s\.studentIds\?\.length \? s\.studentIds : \(s\.studentId \? \[s\.studentId\] : \[\]\)/g, 'getScheduleStudentIds(s)');
            content = content.replace(/selectedTrackerSchedule\?\.studentIds\?\.length \? selectedTrackerSchedule\.studentIds : \(selectedTrackerSchedule\?\.studentId \? \[selectedTrackerSchedule\.studentId\] : \[\]\)/g, 'getScheduleStudentIds(selectedTrackerSchedule)');

            if (content !== original) {
                if (!content.includes('getScheduleStudentIds')) {
                    const relativePath = path.relative(path.dirname(fullPath), path.join(__dirname, 'src', 'utils', 'helpers')).replace(/\\/g, '/');
                    let importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
                    
                    // Simple injection after the first import
                    const lines = content.split('\n');
                    let lastImportIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('import ')) {
                            lastImportIndex = i;
                        }
                    }
                    if (lastImportIndex !== -1) {
                        lines.splice(lastImportIndex + 1, 0, `import { getScheduleStudentIds } from '${importPath}';`);
                    } else {
                        lines.unshift(`import { getScheduleStudentIds } from '${importPath}';`);
                    }
                    content = lines.join('\n');
                }
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Done');
