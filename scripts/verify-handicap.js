const { calculateFechillarHandicap } = require('../app/lib/utils');

const testCases = [
    { input: 0.549, expected: 22 },
    { input: 0.550, expected: 24 },
    { input: 0.600, expected: 24 },
    { input: 0.690, expected: 24 },
    { input: 0.699, expected: 24 },
    { input: 0.700, expected: 26 },
];

let failed = false;

console.log('Verificando rangos de Handicap...');
testCases.forEach(({ input, expected }) => {
    const result = calculateFechillarHandicap(input);
    if (result === expected) {
        console.log(`[PASS] Input: ${input} -> Output: ${result}`);
    } else {
        console.error(`[FAIL] Input: ${input} -> Expected: ${expected}, Got: ${result}`);
        failed = true;
    }
});

if (failed) {
    console.error('Algunas pruebas fallaron.');
    process.exit(1);
} else {
    console.log('Todas las pruebas pasaron correctamente.');
}
