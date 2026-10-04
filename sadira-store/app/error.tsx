"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center">
      <Container>
        <ErrorState
          action={
            <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={retry}>
              Try again
            </Button>
          }
        />
      </Container>
    </main>
  );
}
