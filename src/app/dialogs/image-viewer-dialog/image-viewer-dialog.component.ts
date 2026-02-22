import { Component, HostListener, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface GalleryData {
  images: string[];
  index: number;
}

@Component({
  selector: 'app-image-viewer-dialog',
  templateUrl: './image-viewer-dialog.component.html',
  styleUrls: ['./image-viewer-dialog.component.scss'],
})
export class ImageViewerDialogComponent {
  currentIndex = 0;
  zoom = 1;
  rotation = 0;

  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GalleryData
  ) {
    const firstIndex = this.data?.index ?? 0;
    const hasImages = this.data?.images?.length > 0;
    this.currentIndex = hasImages
      ? Math.min(Math.max(firstIndex, 0), this.data.images.length - 1)
      : 0;
  }

  get hasImages(): boolean {
    return !!this.data?.images?.length;
  }

  get currentImage(): string {
    return this.hasImages ? this.data.images[this.currentIndex] : '';
  }

  canNavigate(): boolean {
    return (this.data?.images?.length ?? 0) > 1;
  }

  previous(): void {
    if (!this.canNavigate()) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.data.images.length) % this.data.images.length;
    this.syncIndex();
  }

  next(): void {
    if (!this.canNavigate()) return;
    this.currentIndex = (this.currentIndex + 1) % this.data.images.length;
    this.syncIndex();
  }

  zoomIn(): void {
    this.zoom = Math.min(this.zoom + 0.15, 3);
  }

  zoomOut(): void {
    this.zoom = Math.max(this.zoom - 0.15, 0.5);
  }

  rotateLeft(): void {
    this.rotation -= 90;
  }

  rotateRight(): void {
    this.rotation += 90;
  }

  resetTransform(): void {
    this.zoom = 1;
    this.rotation = 0;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  @HostListener('window:keydown.arrowleft')
  onArrowLeft(): void {
    this.previous();
  }

  @HostListener('window:keydown.arrowright')
  onArrowRight(): void {
    this.next();
  }

  private syncIndex(): void {
    this.data.index = this.currentIndex;
  }
}
