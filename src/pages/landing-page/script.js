// Script para manejar eventos en la landing page
document.addEventListener('DOMContentLoaded', function() {
    const ctaButton = document.querySelector('.cta-button');
    ctaButton.addEventListener('click', function(event) {
        event.preventDefault();
        alert('¡Gracias por tu interés! Pronto nos pondremos en contacto contigo.');
    });
});