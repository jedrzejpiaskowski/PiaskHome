import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Output,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
@Directive({
  selector: '[appDragDrop]',
})
export class DragDropDirective {
  @Output() files: EventEmitter<FileList> = new EventEmitter();
  @HostBinding('style.background') private background = 'transparent';
  constructor(private sanitizer: DomSanitizer) {}

  @HostListener('dragover', ['$event']) public onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = '#e0e0e0';
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'transparent';
  }

  @HostListener('drop', ['$event']) public onDrop(evt: DragEvent) {
    if (!evt) return;

    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'transparent';

    if (evt.dataTransfer && evt.dataTransfer.files?.length > 0) {
      this.files.emit(evt.dataTransfer.files);
      // for (let i = 0; i < evt.dataTransfer.files.length; i++) {
      //   const file = evt.dataTransfer.files[i];
      //   if (file.type === 'image/jpeg') {
      //     const url = this.sanitizer.bypassSecurityTrustUrl(
      //       window.URL.createObjectURL(file)
      //     );
      //     files.push({ file, url });
      //   }
      // }
      // if (files.length > 0) {
      //   this.files.emit(files);
      // }
    }

  }
}
