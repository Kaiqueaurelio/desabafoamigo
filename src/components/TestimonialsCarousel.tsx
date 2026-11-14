import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export type Testimonial = {
  name: string;
  role: string;
  text: string;
  avatar?: string;
};

interface Props {
  items: Testimonial[];
  /** Autoplay interval in ms. */
  interval?: number;
  className?: string;
}

/**
 * Carrossel de depoimentos com autoplay, pausa no hover/focus,
 * navegação por setas, indicadores e suporte a teclado.
 */
export function TestimonialsCarousel({ items, interval = 5000, className }: Props) {
  const autoplay = React.useRef(
    Autoplay({ delay: interval, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const pause = () => autoplay.current?.stop();
  const resume = () => autoplay.current?.play();

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Depoimentos"
    >
      <Carousel
        setApi={setApi}
        plugins={[autoplay.current]}
        opts={{ loop: true, align: "start" }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {items.map((t, i) => (
            <CarouselItem
              key={`${t.name}-${i}`}
              className="pl-4 md:basis-1/2 lg:basis-1/3"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${items.length}`}
            >
              <figure className="h-full spotlight-card rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-calm)]">
                <Quote className="size-6 text-brand-sky" aria-hidden />
                <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <img
                    src={t.avatar ?? avatarUrl(t.name, 80)}
                    alt=""
                    className="size-10 rounded-full ring-2 ring-brand-soft"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious
          aria-label="Depoimento anterior"
          className="left-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:left-4 md:opacity-100"
        />
        <CarouselNext
          aria-label="Próximo depoimento"
          className="right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:right-4 md:opacity-100"
        />
      </Carousel>

      {count > 1 && (
        <div
          className="mt-6 flex justify-center gap-2"
          role="tablist"
          aria-label="Ir para depoimento"
        >
          {Array.from({ length: count }).map((_, i) => {
            const active = i === selected;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Ir para depoimento ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  active
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TestimonialsCarousel;
