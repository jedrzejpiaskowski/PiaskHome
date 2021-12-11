import { SafeUrl } from "@angular/platform-browser";
import { Observable } from "rxjs";

export interface ImageHandle {
    file: File;
    url: SafeUrl;
    downloadUrl: string;
    uploadProgress$: Observable<number|undefined>|null;
    uploaded: boolean;
  }
  