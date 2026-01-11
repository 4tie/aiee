import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitFeedback } from "@/hooks/use-feedback";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FeedbackProps {
  messageIndex: number;
  projectId: number;
}

export function FeedbackButtons({ messageIndex, projectId }: FeedbackProps) {
  const submitFeedback = useSubmitFeedback();
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const handleFeedback = (rating: 'up' | 'down') => {
    if (voted) return;
    setVoted(rating);
    submitFeedback.mutate({
      rating,
      messageIndex,
      projectId,
      comment: ""
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 bg-card/50 border border-white/5",
          voted === 'up' && "text-green-500 bg-green-500/10"
        )}
        onClick={() => handleFeedback('up')}
        disabled={!!voted || submitFeedback.isPending}
      >
        <ThumbsUp className="h-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 bg-card/50 border border-white/5",
          voted === 'down' && "text-red-500 bg-red-500/10"
        )}
        onClick={() => handleFeedback('down')}
        disabled={!!voted || submitFeedback.isPending}
      >
        <ThumbsDown className="h-3.5 h-3.5" />
      </Button>
    </div>
  );
}
