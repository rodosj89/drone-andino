(function () {
    // ============================================
    // 1. SELECCIONAR TODOS LOS VIDEOS (EXCEPTO EL HÉROE)
    // ============================================
    // Asumiendo que tu video del héroe tiene un ID como 'hero-video'
    const heroVideo = document.getElementById('hero-video');
    const otrosVideos = document.querySelectorAll('video:not(#hero-video)');

    // ============================================
    // 2. CONFIGURAR CADA VIDEO CON LAZY LOADING
    // ============================================
    otrosVideos.forEach(video => {
        // Guardamos la URL del video en un atributo personalizado
        const videoSrc = video.querySelector('source')?.src || video.src;
        
        if (videoSrc) {
            // Guardamos la ruta en data-src
            video.dataset.src = videoSrc;
            
            // Limpiamos el src original para que NO se cargue al inicio
            if (video.querySelector('source')) {
                video.querySelector('source').src = '';
            } else {
                video.src = '';
            }
            
            // También guardamos el poster si tiene
            if (video.poster) {
                video.dataset.poster = video.poster;
                video.poster = ''; // Limpiamos el poster para que no cargue imagen
            }
        }
    });

    // ============================================
    // 3. CREAR INTERSECTION OBSERVER
    // ============================================
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            
            if (entry.isIntersecting) {
                // ✅ El video está visible → CARGARLO
                cargarVideo(video);
                // Dejar de observarlo una vez cargado
                videoObserver.unobserve(video);
                console.log(`🎬 Video cargado: ${video.id || 'sin-id'}`);
            }
        });
    }, {
        // Activar cuando al menos el 30% del video sea visible
        threshold: 0.3,
        // Margen de 200px antes de que entre en pantalla (para precargar)
        rootMargin: '200px'
    });

    // ============================================
    // 4. OBSERVAR CADA VIDEO
    // ============================================
    otrosVideos.forEach(video => {
        videoObserver.observe(video);
    });

    // ============================================
    // 5. FUNCIÓN PARA CARGAR EL VIDEO
    // ============================================
    function cargarVideo(video) {
        // Restaurar el poster
        if (video.dataset.poster) {
            video.poster = video.dataset.poster;
        }
        
        // Restaurar el src
        if (video.dataset.src) {
            if (video.querySelector('source')) {
                video.querySelector('source').src = video.dataset.src;
            } else {
                video.src = video.dataset.src;
            }
            // Recargar el video
            video.load();
        }
    }
})()