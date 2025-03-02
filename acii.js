/**
 * Enhanced ASCII art generator
 * This script can convert an image to high-quality ASCII art in the browser
 */

class ASCIIArtGenerator {
    constructor(options = {}) {
        // Extended character set for more detail
        this.charSet = options.charSet || '@%#*+=-:. ';
        // More detailed character set options
        this.detailedCharSet = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';
        this.width = options.width || 100;
        this.invertBrightness = options.invertBrightness || false;
        this.colorMode = options.colorMode || false; // New option for colored ASCII art
        this.contrastFactor = options.contrastFactor || 1.0; // New option for contrast adjustment
        this.brightnessFactor = options.brightnessFactor || 0.0; // New option for brightness adjustment
        this.useDetailedCharSet = options.useDetailedCharSet || false; // Option to use more detailed character set
        this.applyDithering = options.applyDithering || false; // Option to apply dithering
        this.applySharpening = options.applySharpening || false; // Option to apply sharpening
        this.ditherAmount = options.ditherAmount || 0.5; // Amount of dithering to apply
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

        // Apply image preprocessing if needed
        if (this.applySharpening) {
            this.applyUnsharpMask(ctx, canvas.width, canvas.height);
        }

        // Get image data
        let imageData = ctx.getImageData(0, 0, this.width, height);
        let pixels = imageData.data;

        // Apply dithering if enabled
        if (this.applyDithering) {
            pixels = this.applyFloydSteinbergDithering(pixels, this.width, height);
            ctx.putImageData(imageData, 0, 0);
        }

        // Choose character set based on settings
        const activeCharSet = this.useDetailedCharSet ? this.detailedCharSet : this.charSet;

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
                    charIndex = Math.floor(brightness / 256 * activeCharSet.length);
                } else {
                    charIndex = Math.floor((255 - brightness) / 256 * activeCharSet.length);
                }

                // Ensure index is within bounds
                charIndex = Math.max(0, Math.min(charIndex, activeCharSet.length - 1));

                const char = activeCharSet[charIndex];
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
     * Apply unsharp mask filter to sharpen the image
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    applyUnsharpMask(ctx, width, height) {
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Create a copy of the original image data
        const original = new Uint8ClampedArray(pixels);

        // Apply Gaussian blur (simplified)
        const blurred = this.applyGaussianBlur(original, width, height);

        // Apply unsharp mask: original + (original - blurred) * amount
        const amount = 0.8; // Sharpening strength

        for (let i = 0; i < pixels.length; i += 4) {
            for (let j = 0; j < 3; j++) { // Only process RGB channels
                const diff = original[i + j] - blurred[i + j];
                pixels[i + j] = Math.max(0, Math.min(255, original[i + j] + diff * amount));
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Apply a simple Gaussian blur
     * @param {Uint8ClampedArray} pixels - Original pixel data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Uint8ClampedArray} Blurred pixel data
     */
    applyGaussianBlur(pixels, width, height) {
        const result = new Uint8ClampedArray(pixels.length);
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // Only process RGB channels
                    let sum = 0;

                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += pixels[idx] * kernel[ky + 1][kx + 1];
                        }
                    }

                    const idx = (y * width + x) * 4 + c;
                    result[idx] = sum / kernelSum;
                }

                // Copy alpha channel
                const alphaIdx = (y * width + x) * 4 + 3;
                result[alphaIdx] = pixels[alphaIdx];
            }
        }

        return result;
    }

    /**
     * Apply Floyd-Steinberg dithering to enhance detail perception
     * @param {Uint8ClampedArray} pixels - Original pixel data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Uint8ClampedArray} Dithered pixel data
     */
    applyFloydSteinbergDithering(pixels, width, height) {
        // Create a copy to work with
        const data = new Uint8ClampedArray(pixels.length);
        for (let i = 0; i < pixels.length; i++) {
            data[i] = pixels[i];
        }

        const ditherAmount = this.ditherAmount;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Only process if not transparent
                if (data[idx + 3] === 0) continue;

                // Get original color
                const oldR = data[idx];
                const oldG = data[idx + 1];
                const oldB = data[idx + 2];

                // Find the closest color in our palette (simplified to grayscale for this example)
                const grayLevel = Math.round((oldR + oldG + oldB) / 3 / 32) * 32;

                // Set the new color
                data[idx] = grayLevel;
                data[idx + 1] = grayLevel;
                data[idx + 2] = grayLevel;

                // Calculate error
                const errR = (oldR - grayLevel) * ditherAmount;
                const errG = (oldG - grayLevel) * ditherAmount;
                const errB = (oldB - grayLevel) * ditherAmount;

                // Distribute error to neighboring pixels
                if (x + 1 < width) {
                    this.addError(data, idx + 4, errR, errG, errB, 7 / 16);
                }

                if (y + 1 < height) {
                    if (x > 0) {
                        this.addError(data, idx - 4 + width * 4, errR, errG, errB, 3 / 16);
                    }

                    this.addError(data, idx + width * 4, errR, errG, errB, 5 / 16);

                    if (x + 1 < width) {
                        this.addError(data, idx + 4 + width * 4, errR, errG, errB, 1 / 16);
                    }
                }
            }
        }

        // Copy back to original array
        for (let i = 0; i < pixels.length; i++) {
            pixels[i] = data[i];
        }

        return pixels;
    }

    /**
     * Helper function to add error in dithering
     */
    addError(data, idx, errR, errG, errB, factor) {
        data[idx] = Math.max(0, Math.min(255, data[idx] + errR * factor));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * factor));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * factor));
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