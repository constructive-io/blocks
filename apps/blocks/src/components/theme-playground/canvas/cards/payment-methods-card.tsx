import { Building2, CreditCard, MoreHorizontal } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@constructive-io/ui/breadcrumb';
import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@constructive-io/ui/item';

import { SinkCard } from './sink-card';

const METHODS = [
  { icon: CreditCard, title: 'Visa •••• 4242', description: 'Expires 08/28', isDefault: true },
  { icon: CreditCard, title: 'Mastercard •••• 8812', description: 'Expires 01/27', isDefault: false },
  { icon: Building2, title: 'Bank transfer (SEPA)', description: 'DE89 •••• 3001', isDefault: false },
];

export function PaymentMethodsCard() {
  return (
    <SinkCard
      contentClassName="flex flex-col gap-3 pt-4"
      footer={
        <Button variant="outline" size="sm" className="w-full">
          Add payment method
        </Button>
      }
    >
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" className="-m-1 inline-flex items-center p-1">
              Billing
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment methods</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ItemGroup>
        {METHODS.map((method) => (
          <Item key={method.title} variant="outline" size="sm">
            <ItemMedia variant="icon">
              <method.icon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="flex items-center gap-2">
                {method.title}
                {method.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </ItemTitle>
              <ItemDescription>{method.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Options for ${method.title}`}>
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Set default</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}
