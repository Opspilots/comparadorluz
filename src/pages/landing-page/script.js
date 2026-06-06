// EnergyDeal Landing Page - Interactive Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Handle all CTA buttons - redirect to form
    const ctaButtons = document.querySelectorAll('.cta-primary');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            if (this.id === 'cta-hero' || this.id === 'cta-final') {
                event.preventDefault();
                document.getElementById('lead-form').scrollIntoView({ behavior: 'smooth' });
                document.querySelector('.lead-form input[name="name"]').focus();
            }
        });
    });

    // Handle lead form submission
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Get form data
            const formData = {
                name: this.querySelector('input[name="name"]').value,
                email: this.querySelector('input[name="email"]').value,
                phone: this.querySelector('input[name="phone"]').value,
                timestamp: new Date().toISOString()
            };

            // Log form submission (in production, this would send to a backend)
            console.log('Form submitted:', formData);

            // Show confirmation message
            const originalText = event.target.querySelector('button').textContent;
            event.target.querySelector('button').textContent = '✓ Comparativa enviada';
            event.target.querySelector('button').style.backgroundColor = '#00cc66';

            // Reset form after 2 seconds
            setTimeout(() => {
                this.reset();
                event.target.querySelector('button').textContent = originalText;
                event.target.querySelector('button').style.backgroundColor = '#ff6600';
                alert('¡Gracias por tu interés! Te contactaremos en las próximas 24 horas con una comparativa personalizada.');
            }, 2000);
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Track button clicks for analytics
    trackAnalytics();
});

// Analytics tracking function
function trackAnalytics() {
    const buttons = document.querySelectorAll('.cta-button');
    buttons.forEach((button, index) => {
        button.addEventListener('click', function() {
            console.log('CTA Button clicked:', this.textContent, 'Position:', index);
        });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', function() {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            if (maxScroll % 25 === 0) {
                console.log('Scroll depth:', Math.round(maxScroll) + '%');
            }
        }
    });
}
