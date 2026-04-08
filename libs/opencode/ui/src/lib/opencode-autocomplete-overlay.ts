import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface AutocompleteItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

@Component({
  selector: 'opencode-autocomplete-overlay',
  imports: [ReactiveFormsModule],
  templateUrl: './opencode-autocomplete-overlay.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeAutocompleteOverlayComponent {
  readonly items = input<AutocompleteItem[]>([]);
  readonly visible = input<boolean>(false);
  readonly trigger = input<{ x: number; y: number } | null>(null);

  readonly select = output<AutocompleteItem>();
  readonly dismiss = output<void>();

  protected readonly searchControl = new FormControl('');
  protected readonly filteredItems = signal<AutocompleteItem[]>([]);

  constructor() {
    this.searchControl.valueChanges.subscribe((query) => {
      this.filterItems(query ?? '');
    });
  }

  ngOnChanges(): void {
    this.filteredItems.set(this.items());
    this.searchControl.setValue('', { emitEvent: false });
  }

  private filterItems(query: string): void {
    const q = query.toLowerCase();
    const filtered = this.items().filter(
      (item) => item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q),
    );
    this.filteredItems.set(filtered);
  }

  protected onSelect(item: AutocompleteItem): void {
    this.select.emit(item);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.dismiss.emit();
    }
  }
}
