import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center">
      <Container>
        <EmptyState
          icon={<SearchX strokeWidth={1.5} />}
          headingLevel="h1"
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          action={<ButtonLink href={ROUTES.home}>Back to home</ButtonLink>}
        />
      </Container>
    </main>
  );
}
