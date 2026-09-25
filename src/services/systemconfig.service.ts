import { prisma } from "../config/prisma.js";

/*
 * CREATE SYSTEM CONFIG
 */
export async function createSystemConfig(data: {
  key: string;
  name: string;
  description?: string;
  type:
    | "STRING"
    | "INTEGER"
    | "DECIMAL"
    | "BOOLEAN"
    | "JSON"
    | "DATE";
  value: string;
  defaultValue?: string;
  category: string;
  isEditable?: boolean;
  isActive?: boolean;
}) {
  const existing = await prisma.systemConfig.findUnique({
    where: {
      key: data.key,
    },
  });

  if (existing) {
    throw new Error("SYSTEM_CONFIG_ALREADY_EXISTS");
  }

  return prisma.systemConfig.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description,
      type: data.type,
      value: data.value,
      defaultValue: data.defaultValue,
      category: data.category,
      isEditable: data.isEditable ?? true,
      isActive: data.isActive ?? true,
    },
  });
}


/*
 * GET ALL SYSTEM CONFIGS
 */
export async function getSystemConfigs() {
  return prisma.systemConfig.findMany({
    orderBy: {
      category: "asc",
    },
  });
}


/*
 * GET ONE SYSTEM CONFIG
 */
export async function getSystemConfigById(id: string) {
  return prisma.systemConfig.findUnique({
    where: {
      id,
    },
  });
}


/*
 * GET CONFIG BY KEY
 *
 * Useful later when the loan application service
 * needs values such as:
 *
 * LOAN_MIN_AMOUNT
 * LOAN_MAX_AMOUNT
 * DEFAULT_INTEREST_RATE
 * etc.
 */
export async function getSystemConfigByKey(key: string) {
  return prisma.systemConfig.findUnique({
    where: {
      key,
    },
  });
}


/*
 * GET CONFIG VALUE
 *
 * Converts the stored string value into the
 * correct JavaScript type based on ConfigType.
 */
export async function getSystemConfigValue(key: string) {
  const config = await prisma.systemConfig.findUnique({
    where: {
      key,
    },
  });

  if (!config || !config.isActive) {
    return null;
  }

  switch (config.type) {
    case "INTEGER":
      return Number.parseInt(config.value, 10);

    case "DECIMAL":
      return Number.parseFloat(config.value);

    case "BOOLEAN":
      return config.value.toLowerCase() === "true";

    case "JSON":
      try {
        return JSON.parse(config.value);
      } catch {
        throw new Error(
          `Invalid JSON value for system configuration: ${key}`
        );
      }

    case "DATE":
      return new Date(config.value);

    case "STRING":
    default:
      return config.value;
  }
}


/*
 * UPDATE SYSTEM CONFIG
 */
export async function updateSystemConfig(
  id: string,
  data: {
    key?: string;
    name?: string;
    description?: string;
    type?:
      | "STRING"
      | "INTEGER"
      | "DECIMAL"
      | "BOOLEAN"
      | "JSON"
      | "DATE";
    value?: string;
    defaultValue?: string;
    category?: string;
    isEditable?: boolean;
    isActive?: boolean;
  }
) {
  const config = await prisma.systemConfig.findUnique({
    where: {
      id,
    },
  });

  if (!config) {
    throw new Error("SYSTEM_CONFIG_NOT_FOUND");
  }

  if (!config.isEditable) {
    throw new Error("SYSTEM_CONFIG_NOT_EDITABLE");
  }

  /*
   * If the key is being changed, make sure
   * another configuration does not already
   * use that key.
   */
  if (data.key && data.key !== config.key) {
    const existing = await prisma.systemConfig.findUnique({
      where: {
        key: data.key,
      },
    });

    if (existing) {
      throw new Error("SYSTEM_CONFIG_ALREADY_EXISTS");
    }
  }

  return prisma.systemConfig.update({
    where: {
      id,
    },
    data,
  });
}


/*
 * DELETE SYSTEM CONFIG
 */
export async function deleteSystemConfig(id: string) {
  const config = await prisma.systemConfig.findUnique({
    where: {
      id,
    },
  });

  if (!config) {
    throw new Error("SYSTEM_CONFIG_NOT_FOUND");
  }

  if (!config.isEditable) {
    throw new Error("SYSTEM_CONFIG_NOT_EDITABLE");
  }

  return prisma.systemConfig.delete({
    where: {
      id,
    },
  });
}