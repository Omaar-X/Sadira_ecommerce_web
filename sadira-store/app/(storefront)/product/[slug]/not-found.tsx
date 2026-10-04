import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export default function ProductNotFound() {
  return (
    <main className="flex flex-1 items-center">
      <Container>
        <EmptyState
          icon={<SearchX strokeWidth={1.5} />}
          headingLevel="h1"
          title="Product not found"
          description="This product may no longer be available."
          action={<ButtonLink href={ROUTES.shop}>Continue Shopping</ButtonLink>}
        />
      </Container>
    </main>
  );
}
