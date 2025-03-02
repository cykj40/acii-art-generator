/**
 * Enhanced ASCII art generator
 * This script can convert an image to high-quality ASCII art in the browser
 */

class ASCIIArtGenerator {
    constructor(options = {}) {
        // Extended character set for more detail
        this.charSet = options.charSet || '@%#*+=-:. ';
        this.width = options.width || 100;
        this.invertBrightness = options.invertBrightness || false;
        this.colorMode = options.colorMode || false; // New option for colored ASCII art
        this.contrastFactor = options.contrastFactor || 1.0; // New option for contrast adjustment
        this.brightnessFactor = options.brightnessFactor || 0.0; // New option for brightness adjustment
    }

    /**
     * Convert an image to ASCII art
     * @param {HTMLImageElement} image - The image to convert
     * @returns {string} The ASCII art representation
     */
    convertImageToASCII(image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate height to maintain aspect ratio
        const ratio = image.height / image.width;
        const height = Math.floor(this.width * ratio * 0.5); // Adjust for character aspect ratio

        canvas.width = this.width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(image, 0, 0, this.width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, this.width, height);
        const pixels = imageData.data;

        let asciiArt = '';
        let coloredAsciiArt = document.createElement('div');
        coloredAsciiArt.style.lineHeight = '0.8';
        coloredAsciiArt.style.fontFamily = 'monospace';
        coloredAsciiArt.style.whiteSpace = 'pre';

        // Process each pixel
        for (let y = 0; y < height; y++) {
            let lineSpan = document.createElement('div');

            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                const alpha = pixels[idx + 3];

                // Skip fully transparent pixels
                if (alpha === 0) {
                    asciiArt += ' ';
                    continue;
                }

                // Improved brightness calculation using perceived luminance
                // Human eye is more sensitive to green, less to blue
                let brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

                // Apply contrast and brightness adjustments
                brightness = this.applyContrastAndBrightness(brightness);

                // Map brightness to character
                let charIndex;
                if (this.invertBrightness) {
                    charIndex = Math.floor(brightness / 256 * this.charSet.length);
                } else {
                    charIndex = Math.floor((255 - brightness) / 256 * this.charSet.length);
                }

                // Ensure index is within bounds
                charIndex = Math.max(0, Math.min(charIndex, this.charSet.length - 1));

                const char = this.charSet[charIndex];
                asciiArt += char;

                // For colored ASCII art
                if (this.colorMode) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = char;
                    charSpan.style.color = `rgb(${r},${g},${b})`;
                    lineSpan.appendChild(charSpan);
                }
            }

            asciiArt += '\n';
            if (this.colorMode) {
                coloredAsciiArt.appendChild(lineSpan);
            }
        }

        return this.colorMode ? coloredAsciiArt : asciiArt;
    }

    /**
     * Apply contrast and brightness adjustments to a pixel value
     * @param {number} value - The pixel brightness value (0-255)
     * @returns {number} The adjusted brightness value
     */
    applyContrastAndBrightness(value) {
        // Apply contrast (multiply around the midpoint 128)
        let adjusted = (value - 128) * this.contrastFactor + 128;

        // Apply brightness (add)
        adjusted += this.brightnessFactor * 255;

        // Clamp to valid range
        return Math.max(0, Math.min(255, adjusted));
    }

    /**
     * Load an image and convert it to ASCII art
     * @param {string} imageUrl - URL of the image to convert
     * @returns {Promise<string|HTMLElement>} Promise resolving to ASCII art
     */
    async convertImageFromURL(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
                const asciiArt = this.convertImageToASCII(img);
                resolve(asciiArt);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = imageUrl;
        });
    }

    /**
     * Display ASCII art in a pre element
     * @param {string|HTMLElement} asciiArt - The ASCII art to display
     * @param {HTMLElement} container - The container element
     */
    displayASCII(asciiArt, container) {
        container.innerHTML = '';

        if (typeof asciiArt === 'string') {
            const pre = document.createElement('pre');
            pre.style.fontFamily = 'monospace';
            pre.style.lineHeight = '0.8';
            pre.style.fontSize = '8px';
            pre.style.whiteSpace = 'pre';
            pre.textContent = asciiArt;
            container.appendChild(pre);
        } else {
            // For colored ASCII art
            container.appendChild(asciiArt);
        }
    }
}

// Example usage (in browser):
// 
// const ascii = new ASCIIArtGenerator({
//   width: 100,
//   charSet: '@%#*+=-:. ',
//   invertBrightness: false
// });
// 
// // Convert from URL
// ascii.convertImageFromURL('path/to/image.jpg')
//   .then(art => {
//     ascii.displayASCII(art, document.getElementById('output'));
//   })
//   .catch(err => console.error(err));
//
// // Or with a file input:
// document.getElementById('imageInput').addEventListener('change', (e) => {
//   const file = e.target.files[0];
//   if (file) {
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       const img = new Image();
//       img.onload = () => {
//         const art = ascii.convertImageToASCII(img);
//         ascii.displayASCII(art, document.getElementById('output'));
//       };
//       img.src = event.target.result;
//     };
//     reader.readAsDataURL(file);
//   }
// });

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASCIIArtGenerator;
} 