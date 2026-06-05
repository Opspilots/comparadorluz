// Script para la landing page

document.addEventListener('DOMContentLoaded', function() {
    const ctaButton = document.querySelector('.cta-button');
    ctaButton.addEventListener('click', function(event) {
        event.preventDefault();
        alert('¡Gracias por tu interés! Estaremos en contacto contigo pronto.');
    });
});