export default class BaseController {
  protected handleError(err: any) {
    if (err.response && err.response.data) {
      console.log(err.response.data);
    } else {
      console.log(err);
    }
  }

  protected createUrl(baseUrl: string, queryObj: any): string {
    let url = baseUrl;
    let firstParam = true;

    Object.keys(queryObj).forEach(param => {
      const query = param + '=' + queryObj[param];
      firstParam ? url += '?' : url += '&';
      url += query;
      firstParam = false;
    });

    return url;
  }

  protected createQuery(queryObj: any): string {
    let url = '';
    let firstParam = true;

    Object.keys(queryObj).forEach(param => {
      const query = param + '=' + queryObj[param];
      firstParam ? url += '?' : url += '&';
      url += query;
      firstParam = false;
    });

    return url;
  }

  protected stringToBoolean(input: string): boolean {
    return input === 'true';
  }
}