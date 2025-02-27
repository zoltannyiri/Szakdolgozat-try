import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnInit{
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;

  currentTextIndex = 0;
  headerText: string[] = ["hihats", "drumsets", "melodies", "loops"];
  displayedText: string = "";

  ngOnInit(): void {
    setTimeout(() => this.changeHeaderText(), 500);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const video = this.videoElement.nativeElement;
      video.muted = true;
      video.play().catch(err => {
        console.error("Autoplay failed:", err);
      });
    });
  }

  private changeHeaderText(): void {
    this.currentTextIndex = (this.currentTextIndex + 1) % this.headerText.length;
    this.deleteHeaderText();
  }

  private deleteHeaderText(): void {
    if (this.displayedText.length === 0) {
      setTimeout(() => this.typeHeaderText(), 100);
    } else {
      this.displayedText = this.displayedText.slice(0, -1);
      setTimeout(() => this.deleteHeaderText(), 100);
    }
  }

  private typeHeaderText(): void {
    const currentWord = this.headerText[this.currentTextIndex];
    if (this.displayedText.length === currentWord.length) {
      setTimeout(() => this.changeHeaderText(), 2000);
    } else {
      this.displayedText = currentWord.substring(0, this.displayedText.length + 1);
      setTimeout(() => this.typeHeaderText(), 100);
    }
  }


}