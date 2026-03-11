import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService, Comment } from '../../../../core/services/comment';
import { AuthService } from '../../../../core/services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-stall-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stall-comments.html',
  styleUrls: ['./stall-comments.scss']
})
export class StallComments implements OnInit, OnDestroy {
  @Input() stallId!: number;
  
  comments: Comment[] = [];
  newCommentText = '';
  isLoadingComments = false;
  isPostingComment = false;
  errorMessage = '';
  currentUserId: number | null = null;
  
  private commentSubscription?: Subscription;

  constructor(
    private commentService: CommentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.currentUserId = user?.studentId || null;
    
    if (this.stallId) {
      this.loadComments();
    }
  }

  ngOnDestroy(): void {
    if (this.commentSubscription) {
      this.commentSubscription.unsubscribe();
    }
  }

  loadComments(): void {
    this.isLoadingComments = true;
    this.errorMessage = '';
    
    this.commentService.getCommentsByStall(this.stallId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load comments';
        this.isLoadingComments = false;
      }
    });
  }

  postComment(): void {
    if (!this.newCommentText.trim()) {
      this.errorMessage = 'Comment cannot be empty';
      return;
    }

    if (this.newCommentText.length > 500) {
      this.errorMessage = 'Comment must be less than 500 characters';
      return;
    }

    this.isPostingComment = true;
    this.errorMessage = '';

    const request = {
      stallId: this.stallId,
      commentText: this.newCommentText.trim()
    };

    this.commentService.addComment(request).subscribe({
      next: (comment) => {
        // Add new comment to the top of the list
        this.comments.unshift(comment);
        this.newCommentText = '';
        this.isPostingComment = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to post comment';
        this.isPostingComment = false;
      }
    });
  }

  deleteComment(commentId: number): void {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        // Remove comment from list
        this.comments = this.comments.filter(c => c.commentId !== commentId);
      },
      error: (error) => {
        alert('Failed to delete comment');
      }
    });
  }

  isMyComment(comment: Comment): boolean {
    return this.currentUserId !== null && comment.userId === this.currentUserId;
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  getUserInitial(userName: string): string {
    return userName ? userName.charAt(0).toUpperCase() : '?';
  }
}