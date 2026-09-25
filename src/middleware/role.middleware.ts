import type { Request, Response, NextFunction } from "express";

import type { Role } from "../generated/prisma/enums.js";


/*
 * Authorization middleware.
 *
 * This middleware is used AFTER authenticate().
 *
 * Example:
 *
 * router.post(
 *   "/",
 *   authenticate,
 *   authorize("ADMIN", "SUPER_ADMIN"),
 *   createSomething
 * );
 */
export function authorize(
  ...allowedRoles: Role[]
) {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {

    /*
     * authenticate() should always run before authorize().
     */
    if (!req.user) {

      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }


    /*
     * Check whether the user's role is allowed.
     */
    if (!allowedRoles.includes(req.user.role as Role)) {

      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });

      return;
    }


    /*
     * User has the required role.
     */
    next();

  };

}