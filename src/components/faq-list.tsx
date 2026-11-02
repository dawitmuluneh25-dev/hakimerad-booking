import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { FAQS } from "@/lib/procedures.ts";

export default function FaqList() {
  return (
    <Accordion className="rounded-xl border bg-card px-5">
      {FAQS.map((f) => (
        <AccordionItem key={f.q} value={f.q}>
          <AccordionTrigger className="cursor-pointer text-base">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
