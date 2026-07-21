import { readFileSync } from 'fs';
try {
    const log = readFileSync('error.log', 'utf8');
    console.log('ERROR LOG CONTENTS:\n' + log);
} catch (e) {
    console.log(e);
}
