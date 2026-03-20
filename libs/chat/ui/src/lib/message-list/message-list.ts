import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { ChatMessage } from '@qos/chat/shared-models';
import { ChatMessageItem } from '../message/message';

@Component({
  selector: 'chat-message-list',
  imports: [HlmSpinnerImports, ChatMessageItem],
  templateUrl: './message-list.html',
  styles: `
    .welcome-float-enter {
      animation: welcome-float-enter 460ms cubic-bezier(0.23, 1, 0.32, 1);
    }

    @keyframes welcome-float-enter {
      from {
        opacity: 0.01;
        transform: translateY(32px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .welcome-line-enter {
      animation: welcome-line-enter 380ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }

    .welcome-line-enter--first {
      animation-delay: 80ms;
    }

    .welcome-line-enter--second {
      animation-delay: 150ms;
    }

    @keyframes welcome-line-enter {
      from {
        opacity: 0.01;
        transform: translateY(14px);
        filter: blur(6px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .welcome-float-enter {
        animation-duration: 180ms;
      }

      .welcome-line-enter {
        animation-duration: 160ms;
        animation-delay: 0ms;
      }

      @keyframes welcome-float-enter {
        from {
          opacity: 0;
          transform: none;
        }

        to {
          opacity: 1;
          transform: none;
        }
      }

      @keyframes welcome-line-enter {
        from {
          opacity: 0;
          transform: none;
          filter: none;
        }

        to {
          opacity: 1;
          transform: none;
          filter: none;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageList {
  readonly messages = input.required<ChatMessage[]>();
  readonly streamingContent = input('');
  readonly isStreaming = input(false);
  readonly isConversationLoading = input(false);
  readonly isInitialChat = input(false);
  readonly currentUserDisplayName = input<string | undefined>();
}
