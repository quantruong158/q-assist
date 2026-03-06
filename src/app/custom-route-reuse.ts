import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

export class CustomRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.component === curr.component;
  }
}
