import { Injectable } from '@angular/core';
import PhotoSwipeLightbox, { DataSource } from 'photoswipe/lightbox';

function loadImageSize(src: string): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ src, width: 1200, height: 900 });
    img.src = src;
  });
}

/**
 * Opens the PhotoSwipe lightbox for a set of image URLs.
 *
 * PhotoSwipe must NOT be wrapped in a MatDialog: the CDK renders its overlay
 * wrapper as `popover="manual"`, which puts the whole overlay (backdrop
 * included) in the browser's top layer. Top-layer content paints above every
 * normal-layer element regardless of z-index, so the CDK backdrop covered the
 * lightbox and swallowed every click on its buttons — only keyboard shortcuts,
 * which PhotoSwipe binds on `document`, still worked.
 */
@Injectable({ providedIn: 'root' })
export class ImageViewerService {
  private lightbox?: PhotoSwipeLightbox;

  async open(images: string[], index = 0): Promise<void> {
    // Never leave a previous instance alive; guarantees a single live lightbox.
    this.close();

    const dataSource: DataSource = await Promise.all(images.map(loadImageSize));

    const lightbox = new PhotoSwipeLightbox({
      dataSource,
      pswpModule: () => import('photoswipe'),
      wheelToZoom: true,
      showHideAnimationType: 'none',
      preloadFirstSlide: false,
    });

    lightbox.init();
    lightbox.loadAndOpen(index);
    this.lightbox = lightbox;
  }

  close(): void {
    this.lightbox?.destroy();
    this.lightbox = undefined;
  }
}
