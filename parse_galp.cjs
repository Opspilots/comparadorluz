const fs = require('fs');
const pdf = require('pdf-parse');
let dataBuffer = fs.readFileSync('public/02022026_GALP ELECTRICIDAD_PRECIOS FIJO BASE (1).pdf');
pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('galp_text.txt', data.text);
    console.log('PDF parsed successfully.');
}).catch(console.error);
