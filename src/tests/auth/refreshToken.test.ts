import { success } from 'zod';
import { refreshToken } from '../../controllers/auth.controller';
import * as authService from '../../services/auth.service';
import { Request,Response,NextFunction } from 'express';

const mockReq = (cookies={})=>({ cookies } as unknown as Request);
const mockRes = () => {
    const res : any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
} ;
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockRefreshTokenService = authService.refreshTokenService as jest.Mock;
jest.mock('../../services/auth.service');

describe("Refresh Token Controller", () => {
    it("should return 401 if refresh token is missing", async () => {
        const req = mockReq({}); // no refreshToken cookie
        const res = mockRes();

        await refreshToken(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 401
            }),
        );
    });

    it("should return 200 and new access token if refresh token is valid", async () => {
        const req = mockReq({ refreshToken: "valid-refresh-token" });
        const res = mockRes();

        mockRefreshTokenService.mockResolvedValue(undefined);

        await refreshToken(req, res, mockNext);

        expect(mockRefreshTokenService).toHaveBeenCalledWith(
            expect.any(String),
            req,
            res,
            expect.any(Date),
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
            }),
        );
    });
});