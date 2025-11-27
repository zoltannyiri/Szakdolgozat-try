import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [RouterLink]
})
export class HomeComponent implements AfterViewInit, OnInit {
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;

  currentTextIndex = 0;
  headerText: string[] = ["hihateket", "drumseteket", "dallamokat", "loopokat"];
  displayedText: string = "";

  ngOnInit(): void {
    setTimeout(() => this.changeHeaderText(), 800);
  }

  ngAfterViewInit() {
    const video = this.videoElement.nativeElement;
    
    video.muted = true;
    video.playsInline = true;
    
    const playVideo = () => {
      video.play().catch(err => {
        console.log("Autoplay prevented, waiting for user interaction");
      });
    };
    
    playVideo();
    
    document.addEventListener('click', playVideo);
    document.addEventListener('touchstart', playVideo);
  }

  private changeHeaderText(): void {
    this.currentTextIndex = (this.currentTextIndex + 1) % this.headerText.length;
    this.deleteHeaderText();
  }

  private deleteHeaderText(): void {
    if (this.displayedText.length === 0) {
      setTimeout(() => this.typeHeaderText(), 150);
    } else {
      this.displayedText = this.displayedText.slice(0, -1);
      setTimeout(() => this.deleteHeaderText(), 50);
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