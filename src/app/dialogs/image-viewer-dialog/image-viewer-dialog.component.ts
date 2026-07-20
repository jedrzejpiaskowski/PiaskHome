import { AfterViewInit, Component, Inject, OnDestroy } from '@angular/core';
import {
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';
import PhotoSwipeLightbox, { DataSource } from 'photoswipe/lightbox';

export interface GalleryData {
  images: string[];
  index: number;
}

function loadImageSize(src: string): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ src, width: 1200, height: 900 });
    img.src = src;
  });
}

@Component({
  selector: 'app-image-viewer-dialog',
  templateUrl: './image-viewer-dialog.component.html',
  styleUrls: ['./image-viewer-dialog.component.scss'],
})
export class ImageViewerDialogComponent implements AfterViewInit, OnDestroy {
  private lightbox?: PhotoSwipeLightbox;

  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GalleryData
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const dataSource: DataSource = await Promise.all(this.data.images.map(loadImageSize));

    this.lightbox = new PhotoSwipeLightbox({
      dataSource,
      pswpModule: () => import('photoswipe'),
      wheelToZoom: true,
      showHideAnimationType: 'none',
      preloadFirstSlide: false,
    });
    this.lightbox.on('close', () => this.dialogRef.close());
    this.lightbox.init();
    this.lightbox.loadAndOpen(this.data.index);
  }

  ngOnDestroy(): void {
    this.lightbox?.destroy();
  }
}
