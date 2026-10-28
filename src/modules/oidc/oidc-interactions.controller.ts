import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { getAllowedOrigins } from 'src/shared/utils/allowed-origins';
import { OidcInteractionsService } from './oidc-interactions.service';
import { OidcProviderService } from './oidc-provider.service';
import { renderErrorPage } from './oidc-views';

// Used by the provider's redirects and the frontend login page only.
@ApiExcludeController()
@Controller('sso/interactions')
export class OidcInteractionsController {
  constructor(
    private readonly interactions: OidcInteractionsService,
    private readonly oidc: OidcProviderService,
  ) {}

  /** The browser arrives here from the provider: a page, not JSON. */
  @Get(':uid')
  async entry(
    @Param('uid') uid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let location: string;
    try {
      location = await this.interactions.resolveEntry(uid, req, res);
    } catch (error) {
      if (
        this.oidc.enabled &&
        error instanceof HttpException &&
        error.getStatus() < 500
      ) {
        res
          .status(error.getStatus())
          .setHeader('X-Frame-Options', 'DENY')
          .setHeader('Content-Security-Policy', "frame-ancestors 'none'")
          .type('html')
          .send(
            renderErrorPage({
              frontendUrl: this.oidc.frontendUrl,
              code: 'login_request_expired',
            }),
          );
        return;
      }

      throw error;
    }

    res.redirect(303, location);
  }

  @Get(':uid/details')
  details(
    @Param('uid') uid: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.interactions.getDetails(uid, req, res);
  }

  @Post(':uid/confirm')
  @HttpCode(200)
  confirm(
    @Param('uid') uid: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertFromFrontend(req);
    return this.interactions.confirm(uid, req, res);
  }

  @Post(':uid/abort')
  @HttpCode(200)
  abort(
    @Param('uid') uid: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertFromFrontend(req);
    return this.interactions.abort(uid, req, res);
  }
}

// Consent is given by the session cookies alone, which a form on another
// site of the same domain (any *.example.com) would also send. Browsers always
// send Origin on POST, so only our frontend can confirm or abort.
function assertFromFrontend(req: Request) {
  const { origin } = req.headers;

  if (!origin || !getAllowedOrigins().includes(origin)) {
    throw new ForbiddenException('Request must come from the VTG site');
  }
}
