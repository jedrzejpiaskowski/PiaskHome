import { Component, Inject, OnInit } from '@angular/core';
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
  public config: any;

  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GalleryData
  ) {
    this.config = {
      btnClass: 'img-button', // The CSS class(es) that will apply to the buttons
      zoomFactor: 0.15, // The amount that the scale will be increased by
      containerBackgroundColor: 'transparent', // The color to use for the background. This can provided in hex, or rgb(a).
      wheelZoom: true, // If true, the mouse wheel can be used to zoom in
      allowFullscreen: true, // If true, the fullscreen button will be shown, allowing the user to enter fullscreen mode
      allowKeyboardNavigation: true, // If true, the left / right arrow keys can be used for navigation
      btnIcons: {
        // The icon classes that will apply to the buttons. By default, font-awesome is used.
        zoomIn: 'zoom-in',
        zoomOut: 'zoom-out',
        rotateClockwise: 'right',
        rotateCounterClockwise: 'left',
        next: 'next',
        prev: 'previous',
        fullscreen: 'fullscreen',
      },
      btnShow: {
        zoomIn: true,
        zoomOut: true,
        rotateClockwise: true,
        rotateCounterClockwise: true,
        next: true,
        prev: true,
      },
    };
  }
}
