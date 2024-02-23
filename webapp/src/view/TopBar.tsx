import axios from "axios";
import { useCallback } from "react";
import { User } from "../model";
import {
  Avatar,
  Text,
  Flex,
  Spacer,
  Icon,
  Image,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Box,
  BoxProps,
  useColorMode,
  IconButton,
  Show,
} from "@chakra-ui/react";
import { MdAdd, MdLightMode, MdLogout, MdNightsStay } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  user: User;
  height?: BoxProps["height"];
  px?: BoxProps["px"];
};

function TopBar({ user, height, px }: Readonly<Props>) {
  const handleLogout = useCallback(() => {
    axios
      .post("/api/auth/logout", null)
      .then(() => {
        window.location.replace("/login");
      })
      .catch(console.error);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();
  const darkMode = colorMode == "dark";

  return (
    <Box
      data-testid="top-bar"
      px={px}
      height={height}
      width="100%"
      position="fixed"
      top={0}
      zIndex={1}
      boxShadow="sm"
      bg="white"
      _dark={{
        bg: "gray.900",
      }}
    >
      <Flex height="100%" alignItems="center" gap={6}>
        <Image src={darkMode ? "/DarkLogoMyPaste.svg" : "/LogoMyPaste.svg"} />
        <Spacer />
        {location.pathname == "/" && (
          <Show above="md">
            <Button
              colorScheme="brand"
              borderRadius="16px"
              leftIcon={<Icon as={MdAdd} boxSize={6} />}
              onClick={() => navigate("/add-paste")}
            >
              Add
            </Button>
          </Show>
        )}
        <IconButton
          size="md"
          aria-label="toggle color mode"
          variant="ghost"
          onClick={toggleColorMode}
          icon={<Icon as={darkMode ? MdLightMode : MdNightsStay} boxSize={6} />}
        />
        <Popover autoFocus={false}>
          <PopoverTrigger>
            <Avatar
              bg="teal.300"
              _dark={{ bg: "teal.200" }}
              as={Button}
              size="md"
              name={user.Name}
            />
          </PopoverTrigger>
          <PopoverContent mx={2}>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader textAlign="center">{user.Name}</PopoverHeader>
            <PopoverBody textAlign="center">
              <Text fontSize="sm" mt={4} mb={6}>
                {user.Email}
              </Text>
              <Button
                leftIcon={<Icon as={MdLogout} boxSize={6} />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Box>
  );
}

export default TopBar;
